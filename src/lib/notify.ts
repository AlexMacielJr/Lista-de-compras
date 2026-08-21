import { HouseholdUser } from '../types';

export const notifyUsers = async (
  type: 'list_updated' | 'expense_added' | 'account_registered',
  participants: HouseholdUser[],
  data: any,
  currentUserId?: string
) => {
  try {
    // Only target users who have email and want notifications
    const targetEmails = participants
      .filter(p => p.email && p.id !== currentUserId)
      .filter(p => {
        if (!p.notificationPreferences) return true; // Default to true if not set
        if (!p.notificationPreferences.enabled) return false;
        
        if (type === 'expense_added') return p.notificationPreferences.onAdd;
        // Assume 'list_updated' and 'account_registered' use the general enabled or a specific one
        return true;
      })
      .map(p => p.email);

    if (targetEmails.length === 0) return;

    await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        emails: targetEmails,
        data
      })
    });
  } catch (error) {
    console.error('Error triggering notification:', error);
  }
};
