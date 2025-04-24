
import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

const AdminPanel = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*');

        if (error) throw error;

        // Fetch user emails from auth.users through the profiles
        const { data: users, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) throw authError;

        const enrichedProfiles = profiles.map(profile => ({
          ...profile,
          email: users.users.find(u => u.id === profile.id)?.email || 'No email'
        }));

        setUsers(enrichedProfiles);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: !currentStatus }
          : user
      ));

      toast.success(`Admin status updated successfully`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and their admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Admin Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{user.is_admin ? 'Admin' : 'User'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Toggle Admin
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPanel;
