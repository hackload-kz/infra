import { redirect } from 'next/navigation'

export default function LoginPage() {
    // Redirect to home page since login functionality is now integrated there
    redirect('/')
}
