import { CircleQuestionMark } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { H3, Muted } from './ui/typography';
import { Separator } from './ui/separator';

export default function MissingAddressCard() {
  return (
    <Card>
      <CardHeader>
        <H3>Select an address</H3>
        <Separator />
      </CardHeader>
      <CardContent className='flex flex-col gap-4 items-center my-auto text-center'>
        <CircleQuestionMark />
        <Muted>Select an address to continue.</Muted>
      </CardContent>
    </Card>
  );
}
