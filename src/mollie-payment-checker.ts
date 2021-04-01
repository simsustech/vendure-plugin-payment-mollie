import { LanguageCode, PaymentMethodEligibilityChecker } from '@vendure/core';

export const MolliePaymentEligibilityChecker = new PaymentMethodEligibilityChecker({
    code: 'mollie-payment-eligibility-checker',
    description: [
        { languageCode: LanguageCode.en, value: 'Checks that the order total is above some minimum value' },
    ],
    args: {
        orderMinimum: { type: 'int', ui: { component: 'currency-form-input' } },
    },
    check: (ctx, order, args) => {
        return order.totalWithTax >= args.orderMinimum;
    },
});
