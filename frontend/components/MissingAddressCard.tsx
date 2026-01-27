import { UserPlus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { H3, Muted } from './ui/typography';

export default function MissingAddressCard() {
  return (
    <Card className='h-full bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 border-dashed'>
      <CardHeader className='bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-b border-border/50 border-dashed'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-gray-600/10 rounded-lg'>
            <UserPlus className='w-6 h-6 text-gray-600' />
          </div>
          <H3 className='!border-none !pb-0 text-foreground'>Select Recipient</H3>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-6 items-center justify-center py-12 px-6 text-center'>
        <div className='mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700'>
          <ArrowRight className='w-8 h-8 text-gray-400' />
        </div>
        <div className='space-y-2'>
          <h4 className='font-semibold text-foreground'>No recipient selected</h4>
          <Muted className='max-w-xs mx-auto'>
            Enter a recipient address in the transfer form to see their balance information here.
          </Muted>
        </div>
      </CardContent>
    </Card>
  );
}
