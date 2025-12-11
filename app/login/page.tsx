"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGitHub } from "@/lib/auth-utils";
// import { createClient } from "@/lib/supabase.client";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const router = useRouter();

    const handleEmailSignIn = async () => {
        try {
            setLoading(true);
            await signInWithEmail(email, password);
            alert("登录成功！");
            router.push("/");
        } catch (error: any) {
            alert(error.message || "登录失败，请检查邮箱和密码");
        } finally {
            setLoading(false);
        }
    };

    const handleGithubSignIn = async () => {
        try {
            setLoading(true);
            await signInWithGitHub();
            // 注意：GitHub登录会重定向，所以这里不需要额外处理
        } catch (error: any) {
            alert(error.message || "GitHub登录失败");
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-lg md:text-xl">登录</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                        输入您的邮箱和密码登录账户
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">邮箱</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                onKeyDown={(e) => e.key === 'Enter' && handleEmailSignIn()}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">密码</Label>
                                <Link
                                    href="/forgot-password"
                                    className="ml-auto inline-block text-sm underline"
                                >
                                    忘记密码？
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="请输入密码"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleEmailSignIn()}
                            />
                        </div>

                        {/* <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            />
                            <Label htmlFor="remember" className="cursor-pointer">记住我</Label>
                        </div> */}

                        <Button
                            type="button"
                            className="w-full"
                            disabled={loading}
                            onClick={handleEmailSignIn}
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                "登录"
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    或继续使用
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            disabled={loading}
                            onClick={handleGithubSignIn}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="currentColor"
                                    d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                                />
                            </svg>
                            使用 GitHub 登录
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                    <div className="w-full border-t pt-4">
                        <p className="text-center text-xs text-muted-foreground">
                            还没有账户？{" "}
                            <Link href="/register" className="underline underline-offset-4 hover:text-primary">
                                立即注册
                            </Link>
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}