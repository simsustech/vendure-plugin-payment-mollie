import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { Ctx, OrderService, Payment, TransactionalConnection, RequestContext } from '@vendure/core';

@Controller('mollie')
export class MollieController {
    constructor(private connection: TransactionalConnection, private orderService: OrderService) {}

    @Post()
    @HttpCode(200)
    async paymentSettle(@Ctx() ctx: RequestContext, @Body('id') transactionId: string) {
        if (transactionId) {
            const payment = await this.connection.getRepository(ctx, Payment).findOne({
                where: {
                    transactionId: transactionId,
                },
            });
            if (payment) {
                await this.orderService.settlePayment(ctx, payment.id);
            }
        }
        return transactionId || '';
    }
}
