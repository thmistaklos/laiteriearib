
import React, { useState } from 'react';
import { Product } from '../types';
import Button from './Button';
import { useTranslation } from '../hooks/useTranslation';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const { t } = useTranslation();

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) {
      setQuantity(value);
    } else if (e.target.value === "") {
        setQuantity(1); 
    }
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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col">
      <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover"/>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
        {product.description && <p className="text-sm text-gray-600 mb-2 h-10 overflow-hidden text-ellipsis">{product.description}</p>}
        {priceDisplay && <p className="text-xl font-bold text-indigo-600 mb-3">{priceDisplay}</p>}
        
        <div className="mt-auto">
          <div className="flex items-center space-x-2 mb-3">
            <Button 
              onClick={decrementQuantity} 
              size="sm" 
              variant="secondary" 
              className="px-2 py-1! w-8 h-8 flex items-center justify-center"
              aria-label={t('aria.decrementQuantity')}
            >-</Button>
            <label htmlFor={`quantity-${product.id}`} className="sr-only">
              {t('productCard.quantity', { productName: product.name })}
            </label>
            <input
              id={`quantity-${product.id}`}
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
          
          <Button onClick={handleAddToCart} variant="primary" className="w-full">
            {t('main.addToOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
