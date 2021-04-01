import {
    PaymentMethodHandler,
    CreatePaymentResult,
    CreateRefundResult,
    SettlePaymentResult,
    LanguageCode,
    CreatePaymentErrorResult,
} from '@vendure/core';
import createMollieClient from '@mollie/api-client';
import { URL } from 'url';

export const molliePaymentHandler = new PaymentMethodHandler({
    code: 'mollie-payment-provider',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Mollie Payment Provider',
        },
    ],
    args: {
        apiKey: { type: 'string' },
        redirectUrl: { type: 'string' },
        webhookHostname: { type: 'string' },
    },
    createPayment: async (
        ctx,
        order,
        amount,
        args,
        metadata,
    ): Promise<CreatePaymentResult | CreatePaymentErrorResult> => {
        try {
            const mollieClient = createMollieClient({ apiKey: args.apiKey });
            const result = await mollieClient.payments.create({
                amount: {
                    currency: order.currencyCode,
                    value: (order.total / 100).toFixed(2),
                },
                description: `#${order.id}`,
                redirectUrl: metadata.redirectUrl || args.redirectUrl,
                webhookUrl: new URL('/mollie', args.webhookHostname).toString(),
            });
            return {
                amount: order.total,
                state: 'Authorized' as const,
                // state: 'Settled' as const,
                transactionId: result.id.toString(),
                metadata: {
                    public: {
                        url: result.getCheckoutUrl(),
                    },
                },
            };
        } catch (err) {
            // remove
            console.error(err);
            return {
                amount: order.total,
                state: 'Declined' as const,
                errorMessage: err.message,
                metadata: {
                    errorMessage: err.message,
                },
            };
        }
    },
    settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
        const mollieClient = createMollieClient({ apiKey: args.apiKey });
        const molliePayment = await mollieClient.payments.get(payment.transactionId);
        if (molliePayment.isPaid()) {
            return { success: true };
        }
        return { success: false };
    },
    createRefund: async (ctx, input, amount, order, payment, args): Promise<CreateRefundResult> => {
        const mollieClient = createMollieClient({ apiKey: args.apiKey });
        const mollieRefund = await mollieClient.payments_refunds.create({
            paymentId: payment.transactionId,
            amount: {
                currency: order.currencyCode,
                value: (amount / 100).toFixed(2),
            },
        });
        return {
            state: 'Settled',
            transactionId: mollieRefund.id,
            metadata: {
                description: `${mollieRefund.description}: ${input.reason}`,
            },
        };
    },
});
