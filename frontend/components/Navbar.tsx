import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from './ui/navigation-menu';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <div className='w-fit'>
            <WalletMultiButton />
          </div>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
