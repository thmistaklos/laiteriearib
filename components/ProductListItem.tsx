
import React, { useState } from 'react';
import { Product } from '../types';
import Button from './Button';
import { useTranslation } from '../hooks/useTranslation';

interface ProductListItemProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

const ProductListItem: React.FC<ProductListItemProps> = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const { t } = useTranslation();

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) setQuantity(value);
    else if (e.target.value === "") setQuantity(1);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (quantity > 0) {
      onAddToCart(product, quantity);
      setQuantity(1);
    }
  };

  const priceDisplay = product.price !== undefined 
    ? product.quantityType === 'kg' 
      ? t('product.pricePerKg', { price: product.price.toFixed(2) })
      : t('product.pricePerUnit', { price: product.price.toFixed(2) })
    : '';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden p-4 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 rtl:sm:space-x-reverse">
      <img src={product.imageUrl} alt={product.name} className="w-full sm:w-24 h-24 object-cover rounded-md"/>
      <div className="flex-grow">
        <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
        {product.description && <p className="text-sm text-gray-600 mb-1 text-ellipsis overflow-hidden max-h-12">{product.description}</p>}
        {priceDisplay && <p className="text-md font-bold text-indigo-600">{priceDisplay}</p>}
      </div>
      <div className="flex flex-col sm:items-end items-center space-y-2 sm:space-y-0 sm:w-auto w-full">
        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2 sm:mb-0">
           <Button 
            onClick={decrementQuantity} 
            size="sm" 
            variant="secondary" 
            className="px-2 py-1! w-8 h-8 flex items-center justify-center"
            aria-label={t('aria.decrementQuantity')}
          >-</Button>
          <label htmlFor={`quantity-list-${product.id}`} className="sr-only">
             {t('productCard.quantity', { productName: product.name })}
          </label>
          <input
            id={`quantity-list-${product.id}`}
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            min="1"
            className="w-16 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            aria-live="polite"
          />
          <Button 
            onClick={incrementQuantity} 
            size="sm" 
            variant="secondary" 
            className="px-2 py-1! w-8 h-8 flex items-center justify-center"
            aria-label={t('aria.incrementQuantity')}
          >+</Button>
        </div>
        <Button onClick={handleAddToCart} variant="primary" size="sm" className="w-full sm:w-auto">
          {t('main.addToOrder')}
        </Button>
      </div>
    </div>
  );
};

export default ProductListItem;
