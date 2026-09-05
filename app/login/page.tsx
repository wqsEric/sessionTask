import { redirect } from 'next/navigation';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export default async function LoginPage() { if (await getChatGPTUser()) redirect('/'); return <LoginForm />; }
