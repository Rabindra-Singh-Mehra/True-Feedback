'use client';

import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export default function VerifyAccount() {
  const router = useRouter();
  const { toast } = useToast();
  // Page kept temporarily to handle old links; guide user to sign-in
  toast({ title: 'Info', description: 'Email verification is no longer required.' });
  router.replace('/sign-in');
  return null;
}
