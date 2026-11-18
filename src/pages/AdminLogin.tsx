import { API_BASE_URL as CONFIGURED_API_BASE } from '@/services/api';
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, Shield } from "lucide-react";

// ✅ API Base URL for production deployment
const API_BASE_URL = (import.meta.env.VITE_API_URL || CONFIGURED_API_BASE).replace(/\/$/, '');
const UPLOADS_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://pbl-kuala-outdoor-production.up.railway.app';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");


    try {
      // 🔥 CONNECT KE API REAL
      const response = await fetch(`${API_BASE_URL}/admin/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      const data = await response.json();

      if (response.ok && data.message === "Login successful") {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        
        console.log("✅ Login successful, navigating to dashboard...");
        alert("✅ Login berhasil! (Connected to Database)");
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from?.startsWith('/admin/') && from !== '/admin/login' ? from : '/admin/dashboard', { replace: true });
      } else {
        console.log("❌ Login failed:", data.message);
        setError(data.message || 'Login gagal');
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError('❌ Koneksi ke server gagal. Pastikan server backend aktif!');
      
      // 🔧 FALLBACK MODE - Jika API gagal, coba test mode
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <p className="text-gray-600">Kuala Outdoor Management System</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">
                <User className="h-4 w-4 inline mr-2" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username admin"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="h-4 w-4 inline mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                required
                className="h-11"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Loading..." : "🔐 Login Admin"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Hanya untuk admin Kuala Outdoor<br />
              Hubungi supervisor untuk akses
            </p>
            <div className="mt-2 text-xs text-blue-500">
              Test: admin / kuala2024
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
