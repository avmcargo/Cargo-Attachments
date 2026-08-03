import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLogin } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import avmLogo from "@assets/IMG-20260623-WA0021_1785654223496.jpg";

const loginSchema = z.object({
  phone: z.string().min(7, 'Введите корректный номер телефона'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, refetchMe } = useAuth();
  
  useEffect(() => {
    if (user) {
      setLocation(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, setLocation]);

  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          refetchMe();
          if (res.user.role === 'admin') {
            setLocation('/admin');
          } else {
            setLocation('/dashboard');
          }
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Ошибка входа",
            description: error?.error || error?.message || "Неверный логин или пароль",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-sidebar p-8 text-center text-sidebar-foreground">
          <div className="flex justify-center mb-4">
            <img src={avmLogo} alt="AVM CARGO" className="w-16 h-16 rounded-xl object-cover shadow-lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">AVM CARGO</h1>
          <p className="text-sidebar-foreground/70 text-sm font-medium">Панель управления логистикой</p>
        </div>
        
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Номер телефона</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+7 (777) 000-00-00" 
                        {...field} 
                        className="h-12 bg-muted/50 border-border"
                        data-testid="input-login-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Пароль</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="h-12 bg-muted/50 border-border"
                        data-testid="input-login-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-md font-bold mt-2" 
                disabled={loginMutation.isPending}
                data-testid="btn-login-submit"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Войти
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline" data-testid="link-register">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
