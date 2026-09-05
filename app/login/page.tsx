import { redirect } from 'next/navigation';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string; return_to?: string }> }) {
  if (await getChatGPTUser()) redirect('/');
  const params = await searchParams;
  const mode = params.mode === 'register' ? 'register' : 'login';
  const returnTo = params.return_to?.startsWith('/') && !params.return_to.startsWith('//') ? params.return_to : '/';
  return <LoginForm initialMode={mode} initialError={params.error ?? ''} returnTo={returnTo} />;
}
