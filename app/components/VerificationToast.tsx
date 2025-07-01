import React, { useState } from 'react';

import { useTdxQuoteVerification } from '../hooks/use-tdx-quote-verification';
import {
  BadgeCheckIcon,
  Check,
  Cross,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { H3 } from './ui/typography';

const VerificationToast: React.FC = () => {
  const { isVerified, isLoading, resetVerification } = useTdxQuoteVerification();

  const ToastContent = () => {
    if (isLoading) {
      return <H3>Verifying...</H3>;
    } else if (isVerified) {
      return <H3>Verification successful</H3>;
    } else {
      return <H3>Verification failed</H3>;
    }
  };

  const StatusBadge = () => {
    if (isLoading) {
      return (
        <Button variant='outline'>
          <ShieldQuestion className='w-8 h-8' />
          Pending...
        </Button>
      );
    } else if (isVerified) {
      return (
        <Button className='bg-success text-success-foreground'>
          <ShieldCheck className='w-8 h-8' />
          Verified
        </Button>
      );
    } else {
      return (
        <Button variant='destructive'>
          <ShieldOff className='w-8 h-8' />
          Not verified
        </Button>
      );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className='fixed bottom-4 right-4'>
          <StatusBadge />
        </div>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='flex flex-col gap-2'>
          <ToastContent />
          <span style={{ fontSize: '12px', color: '#7F7F7F' }}>
            Make sure the server is running using genuine secure hardware
          </span>
          <Button
            variant='destructive'
            className='w-full'
            onClick={resetVerification}
            disabled={isLoading}
          >
            Reset
            {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VerificationToast;
