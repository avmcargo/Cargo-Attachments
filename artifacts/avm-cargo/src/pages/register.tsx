import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRegister } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { UserPlus, Loader2 } from 'lucide-react';
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

const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  phone: z.string().min(7, 'Введите корректный номер телефона'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, refetchMe } = useAuth();
  
  useEffect(() => {
    if (user) {
      setLocation(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, setLocation]);

  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: () => {
          refetchMe();
          setLocation('/dashboard');
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Ошибка регистрации",
            description: error?.error || error?.message || "Не удалось создать аккаунт",
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
          <h1 className="text-2xl font-black tracking-tight mb-1">Регистрация</h1>
          <p className="text-sidebar-foreground/70 text-sm font-medium">Создайте аккаунт для отслеживания грузов</p>
        </div>
        
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Имя и Фамилия</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Иван Иванов" 
                        {...field} 
                        className="h-12 bg-muted/50 border-border"
                        data-testid="input-register-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        data-testid="input-register-phone"
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
                        data-testid="input-register-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-md font-bold mt-2" 
                disabled={registerMutation.isPending}
                data-testid="btn-register-submit"
              >
                {registerMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Зарегистрироваться
                    <UserPlus className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline" data-testid="link-login">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
