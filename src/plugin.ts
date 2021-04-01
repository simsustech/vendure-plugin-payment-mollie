import { PluginCommonModule, VendurePlugin, OrderService } from '@vendure/core';
import { MollieController } from './controller/mollie.controller';
import { molliePaymentHandler } from './mollie-payment-method';
import { idealPaymentEligibilityChecker } from './eligibility-checkers/ideal-eligibility-checker';
/**
 * This plugin implements the Mollie (https://www.mollie.com/) payment provider.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [MollieController],
    providers: [OrderService],
    configuration: (config) => {
        config.paymentOptions.paymentMethodHandlers.push(molliePaymentHandler);
        config.paymentOptions.paymentMethodEligibilityCheckers?.push(idealPaymentEligibilityChecker);
        return config;
    },
})
export class MolliePlugin {}
