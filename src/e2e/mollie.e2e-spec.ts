import { MolliePlugin } from '../plugin';
import { ChromiumBrowser, firefox, FirefoxBrowser, WebKitBrowser } from 'playwright';
import supertest from 'supertest';

import { createTestEnvironment, registerInitializer, SqljsInitializer } from '@vendure/testing';
import path from 'path';

import { TEST_SETUP_TIMEOUT_MS, testConfig } from './config/test-config';
import { initialData } from './config/e2e-initial-data';
import gql from 'graphql-tag';

const sqliteDataDir = path.join(__dirname, '__data__');
registerInitializer('sqljs', new SqljsInitializer(sqliteDataDir));

jest.setTimeout(1000 * 1000);
const ADD_ITEM_TO_ORDER = gql`
    mutation {
        addItemToOrder(productVariantId: 1, quantity: 1) {
            __typename
        }
    }
`;

const SET_ORDER_SHIPPING_ADDRESS = gql`
    mutation {
        setOrderShippingAddress(
            input: {
                fullName: "test"
                company: "test"
                streetLine1: "test"
                countryCode: "GB"
                defaultShippingAddress: true
                defaultBillingAddress: true
            }
        ) {
            __typename
        }
    }
`;

const SET_CUSTOMER_FOR_ORDER = gql`
    mutation {
        setCustomerForOrder(input: { firstName: "test", lastName: "test", emailAddress: "test@test.test" }) {
            __typename
        }
    }
`;

const TRANSITION_ORDER_STATE = gql`
    mutation {
        transitionOrderToState(state: "ArrangingPayment") {
            __typename
        }
    }
`;

const ADD_PAYMENT_TO_ORDER = gql`
    mutation {
        addPaymentToOrder(
            input: {
                method: "mollie-payment-provider"
                metadata: { redirectUrl: "https://github.com/simsustech/vendure-plugin-payment-mollie" }
            }
        ) {
            ... on Order {
                payments {
                    amount
                    transactionId
                    metadata
                }
            }
        }
    }
`;

const UPDATE_CHANNEL = gql`
    mutation {
        updateChannel(input: { id: 1, currencyCode: EUR }) {
            ... on Channel {
                id
                currencyCode
            }
        }
    }
`;

const UPDATE_PAYMENT_METHOD = (apiKey: string) => gql`
  mutation {
    updatePaymentMethod(input:{
      id: 1,
      configArgs: [{
        name: "webhookHostname",
        value: "https://mollie.com"
      },
      {
        name: "apiKey",
        value: "${apiKey}"
      }]
    }) {
      id
      configArgs {
        name
        value
      }
    }
  }
`;

const CREATE_PAYMENT_METHOD = (apiKey: string) => gql`
  mutation {
    createPaymentMethod(input:{
      name: "mollie-payment-provider",
      code: "mollie-payment-provider",
      enabled: true,
      checker: {
          code: "ideal-payment-eligibility-checker",
          arguments: []
      },
      handler: {
        code: "mollie-payment-provider",
        arguments: [
        {
            name: "webhookHostname",
            value: "https://mollie.com"
        },
        {
            name: "apiKey",
            value: "${apiKey}"
        }]
      }
    }) {
      name
      code
    }
  }
`;

const ORDER_PAYMENT_STATE = (id: number) => gql`
  query {
    order(id: ${id}) {
      payments {
        state
      }
    }
  }
`;

describe('Mollie Plugin', () => {
    const apiKey = process.env.MOLLIE_TEST_API_KEY;
    if (!apiKey) {
        throw new Error('Specify MOLLIE_TEST_API_KEY environment variable first');
    }
    const { server, adminClient, shopClient } = createTestEnvironment({
        ...testConfig,
        plugins: [MolliePlugin],
    });
    let request: supertest.SuperTest<supertest.Test>;
    let browser: FirefoxBrowser | ChromiumBrowser | WebKitBrowser;

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: path.join(__dirname, 'config/e2e-products.csv'),
            customerCount: 1,
            logging: true,
        });
        await adminClient.asSuperAdmin();
        browser = await firefox.launch({ headless: false });
        request = supertest(server.app.getHttpServer());
    }, TEST_SETUP_TIMEOUT_MS);

    afterAll(async () => {
        await server.destroy();
        await browser.close();
    });

    it('should set the correct channel and config args of the mollie-payment-provider', async () => {
        const currencyCode = await adminClient.query(UPDATE_CHANNEL);
        const paymentMethod = await adminClient.query(CREATE_PAYMENT_METHOD(apiKey));
    });

    describe('Rabobank iDEAL', () => {
        let publicUrl: string;
        let transactionId: string;
        it('should be able to add a Mollie payment to an order', async () => {
            await shopClient.query(ADD_ITEM_TO_ORDER);
            await shopClient.query(SET_ORDER_SHIPPING_ADDRESS);
            await shopClient.query(SET_CUSTOMER_FOR_ORDER);
            await shopClient.query(TRANSITION_ORDER_STATE);
            const addPaymentToOrderResult = await shopClient.query(ADD_PAYMENT_TO_ORDER);
            const payment = addPaymentToOrderResult.addPaymentToOrder.payments[0];
            publicUrl = payment.metadata.public.url;
            transactionId = payment.transactionId;
        });

        it('the created payment should have status Authorized', async () => {
            const orderQuery = await adminClient.query(ORDER_PAYMENT_STATE(1));
            const state = orderQuery.order.payments[0].state;
            expect(state).toEqual('Authorized');
        });

        it('should be able to perform the payment', async () => {
            const page = await browser.newPage();
            await page.goto(publicUrl);
            await page.click('text=Rabobank');
            await page.click('text=Paid');
            await page.click('text=Continue', { timeout: 60000 });

            const url = await page.url();
            // Expect redirectUrl
            expect(url).toEqual('https://github.com/simsustech/vendure-plugin-payment-mollie');
        });

        it('should settle the payment after the webhook has been notified', async () => {
            await request
                .post('/mollie')
                .send({
                    id: transactionId,
                })
                .expect((res) => {
                    expect(res.text).toEqual(transactionId);
                })
                .expect(200);
        });

        it('the paid payment should have status Settled', async () => {
            const orderQuery = await adminClient.query(ORDER_PAYMENT_STATE(1));
            const state = orderQuery.order.payments[0].state;
            expect(state).toEqual('Settled');
        });
    });
});
