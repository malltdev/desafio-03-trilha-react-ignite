import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const prod = cart.find( prod => prod.id === productId );

      if(prod){
        updateProductAmount({productId, amount: prod.amount+1});
        return;
      }

      const {data: stock} = await api.get<Stock>(`/stock/${productId}`);

      if(stock.amount < 1){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const {data: product} = await api.get<Product>(`/products/${productId}`);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]));
      setCart([...cart, {...product, amount: 1}]);
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const prod = cart.find( prod => prod.id === productId );
      if(!prod){
        throw new Error("Erro na remoção do produto");
      }
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart.filter(prod => prod.id !== productId)));
      setCart(cart.filter(prod => prod.id !== productId));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const {data: stock} = await api.get<Stock>(`/stock/${productId}`);
      const prod = cart.find( prod => prod.id === productId );

      if(!prod){
        throw new Error();
      }
      if(stock.amount < amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(amount <= 0){
        return;
      }

      prod.amount = amount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart.filter(prod => prod.id !== productId), prod]));
      setCart([...cart.filter(prod => prod.id !== productId), prod])
      
      

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
