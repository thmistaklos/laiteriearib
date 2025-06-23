
import React from 'react';
import { OrderItemType } from '../types';
import Button from './Button';
import { useTranslation } from '../hooks/useTranslation';

interface OrderItemRowProps {
  item: OrderItemType;
  onQuantityChange: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

const OrderItemRow: React.FC<OrderItemRowProps> = ({ item, onQuantityChange, onRemoveItem }) => {
  const { t } = useTranslation();

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
     if (value >= 1) {
      onQuantityChange(item.product.id, value);
    } else if (e.target.value === "") {
       onQuantityChange(item.product.id, 1); 
    }
  };
  
  const increment = () => onQuantityChange(item.product.id, item.quantity + 1);
  const decrement = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.product.id, item.quantity - 1);
    } else {
      onRemoveItem(item.product.id); 
    }
  };

  const itemTotal = item.product.price ? (item.product.price * item.quantity).toFixed(2) : '0.00';
  const quantityInputId = `order-item-quantity-${item.product.id}`;
  
  const unitPriceDisplay = item.product.price !== undefined 
    ? t(item.product.quantityType === 'kg' ? 'product.pricePerKg' : 'product.pricePerUnit', { price: item.product.price.toFixed(2) })
    : '';

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex items-center">
        <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 object-cover rounded-md mr-3 rtl:ml-3 rtl:mr-0"/>
        <div>
          <p className="font-semibold text-gray-700">{item.product.name}</p>
          {unitPriceDisplay && <p className="text-xs text-gray-500">{unitPriceDisplay}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
         <Button 
            onClick={decrement} 
            size="sm" 
            variant="secondary" 
            className="px-1.5 py-0.5! w-7 h-7 flex items-center justify-center"
            aria-label={t('aria.decrementQuantity')}
          >-</Button>
        <label htmlFor={quantityInputId} className="sr-only">
          {t('productCard.quantity', { productName: item.product.name })}
        </label>
        <input
          id={quantityInputId}
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          min="1" 
          className="w-12 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
          aria-live="polite"
        />
        <Button 
            onClick={increment} 
            size="sm" 
            variant="secondary" 
            className="px-1.5 py-0.5! w-7 h-7 flex items-center justify-center"
            aria-label={t('aria.incrementQuantity')}
          >+</Button>
      </div>
      {item.product.price && 
        <p className="w-24 text-right rtl:text-left font-medium text-gray-700">
          {t('currency.format', { amount: itemTotal })}
        </p>
      }
      <Button 
        onClick={() => onRemoveItem(item.product.id)} 
        variant="danger" 
        size="sm" 
        className="px-2 py-1!"
        aria-label={t('aria.removeOrderItem', {productName: item.product.name})}
      >
        {t('productAdmin.delete')}
      </Button>
    </div>
  );
};

export default OrderItemRow;
