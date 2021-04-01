# Mollie payment plugin for Vendure.io

## Warning: Not tested in production yet

This plugins provides a [PaymentMethodHandler](https://www.vendure.io/docs/typescript-api/payment/payment-method-handler/) for [Mollie](https://www.mollie.com/). It also provides a simple PaymentEligibilityChecker which checks if an order can be paid with iDeal according to the [limits](https://help.mollie.com/hc/en-us/articles/115000667365-What-is-the-minimum-and-maximum-amount-per-payment-method-).

## Arguments
- apiKey: The [API key for your Mollie account](https://help.mollie.com/hc/en-us/articles/115000328205-Where-can-I-find-the-live-API-key-)
- webhookHostname: The hostname of your Vendure server. The plugin provides a controller which handles webhooks performed by Mollie after the status of a payment changes. Mollie contacts your server at `https://webhookHostname/mollie`.
- redirectUrl: The URL which Mollie redirects you to after the payment is completed. Can also be set individually for each payment by setting `redirectUrl` in the metadata of [PaymentInput](https://www.vendure.io/docs/graphql-api/shop/input-types/#paymentinput).

## Installation
- `yarn add vendure-plugin-payment-mollie`
- Add MolliePlugin to your [Vendure config](https://www.vendure.io/docs/typescript-api/configuration/vendure-config/):
```
import { MolliePlugin } from 'vendure-plugin-payment-mollie'

...
plugins: [
  ...
  MolliePlugin,
  ....
]
```

You might also want to add your own PaymentEligibilityChecker or CustomPaymentProcess to the configuration.

- Create a new PaymentMethod, either in the Admin UI or with a GraphQL mutation. For example:
```
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
            value: "https://yourvendurehostname"
        },
        {
            name: "apiKey",
            value: "REPLACE_WITH_YOUR_MOLLIE_API_KEY"
        }]
      }
    }) {
      name
      code
    }
  }
  ```

  ### Testing
  To run the tests you need to provide the [test API key](https://docs.mollie.com/guides/testing) as an environment variable:
  ```
   MOLLIE_TEST_API_KEY=test_yourmollietestapikey yarn test
  ```