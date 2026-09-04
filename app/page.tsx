import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { Workspace } from './workspace';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return <Workspace user={user ? { displayName: user.displayName } : null} signInHref={chatGPTSignInPath('/')} />;
}
