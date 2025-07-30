import Link from 'next/link';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from './ui/navigation-menu';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href='/' className={cn(pathname === '/' && 'underline underline-offset-4')}>
              Simple
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href='/advanced' className={cn(pathname === '/advanced' && 'underline')}>
              Advanced
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <div className='w-fit'>
            <WalletMultiButton />
          </div>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
