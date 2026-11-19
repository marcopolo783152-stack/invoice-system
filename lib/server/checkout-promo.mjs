import {CheckoutError} from './rug-checkout.mjs';
export function checkoutPromo(promo,code,now=Date.now()) {
  if (!promo || promo.code!==code || promo.isActive!==true ||
      (promo.oneTimeUse&&(promo.usedAt||promo.usedBy||promo.usedCount>0)) ||
      (promo.validUntil&&(!Number.isFinite(Date.parse(promo.validUntil))||Date.parse(promo.validUntil)<now)) ||
      !['percentage','fixed','free_shipping'].includes(promo.discountType) ||
      (promo.discountType!=='free_shipping'&&(!Number.isFinite(promo.discountValue)||promo.discountValue<0||(promo.discountType==='percentage'&&promo.discountValue>100)))) {
    throw new CheckoutError('Invalid or expired promo code.',400);
  }
  return {code:promo.code,discountType:promo.discountType,discountValue:promo.discountValue,isActive:true};
}
