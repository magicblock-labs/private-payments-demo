import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from './ui/navigation-menu';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <div className='w-fit'>
            <WalletMultiButton className='!bg-gradient-to-r !from-blue-600 !to-purple-600 !border-0 !rounded-lg !px-6 !py-2 !text-white !font-medium !transition-all !duration-300 hover:!from-blue-700 hover:!to-purple-700 hover:!shadow-lg hover:!scale-105' />
          </div>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
