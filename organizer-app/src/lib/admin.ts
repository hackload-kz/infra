// Utility function to check if a user is an organizer
export function isOrganizer(email: string | null | undefined): boolean {
    if (!email) return false;

    const adminUsers = process.env.ADMIN_USERS || '';
    const adminEmails = adminUsers.split(',').map(entry => entry.split(':')[0].trim());

    return adminEmails.includes(email);
}

// Utility function to get admin credentials for login
export function getAdminCredentials(): { email: string; password: string }[] {
    const adminUsers = process.env.ADMIN_USERS || '';
    return adminUsers.split(',').map(entry => {
        const [email, password] = entry.split(':').map(s => s.trim());
        return { email, password };
    }).filter(cred => cred.email && cred.password);
}
