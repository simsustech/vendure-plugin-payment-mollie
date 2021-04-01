import { LanguageCode, PaymentMethodEligibilityChecker } from '@vendure/core';

export const idealPaymentEligibilityChecker = new PaymentMethodEligibilityChecker({
    code: 'ideal-payment-eligibility-checker',
    description: [
        { languageCode: LanguageCode.en, value: 'Checks if the order is eligible to be paid with iDeal' },
    ],
    args: {},
    check: (ctx, order, args) => {
        return order.totalWithTax >= 1 && order.totalWithTax < 5000000;
    },
});
