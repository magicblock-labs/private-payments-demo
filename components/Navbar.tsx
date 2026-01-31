'use client';

import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from './ui/navigation-menu';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void setMounted(true);
  }, []);

  return (
    <NavigationMenu suppressHydrationWarning>
      <NavigationMenuList suppressHydrationWarning>
        <NavigationMenuItem suppressHydrationWarning>
          <div className='w-fit' suppressHydrationWarning>
            {mounted && (
              <WalletMultiButton className='bg-linear-to-r! from-blue-600! to-purple-600! border-0! rounded-lg! px-6! py-2! text-white! font-medium! transition-all! duration-300! hover:from-blue-700! hover:to-purple-700! hover:shadow-lg! hover:scale-105!' />
            )}
          </div>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
