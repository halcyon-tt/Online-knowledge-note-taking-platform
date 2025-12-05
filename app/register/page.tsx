"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail, signInWithGitHub } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";

export default function SignUp() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const router = useRouter();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (userId: string) => {
        if (!image) return null;

        const supabase = createClient();
        if (!supabase) return null;

        const fileExt = image.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('user-avatars')
            .upload(filePath, image);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSignUp = async () => {
        // 验证表单
        if (!username || !email || !password || !confirmPassword) {
            alert("请填写所有必填字段");
            return;
        }

        if (password !== confirmPassword) {
            alert("两次输入的密码不一致");
            return;
        }

        if (password.length < 6) {
            alert("密码长度至少6位");
            return;
        }

        try {
            setLoading(true);

            const supabase = createClient();
            if (!supabase) {
                alert("Supabase未配置");
                return;
            }

            // 检查用户名是否已存在
            const { data: existingUser } = await supabase
                .from('users')
                .select('username')
                .eq('username', username)
                .single();

            if (existingUser) {
                alert("用户名已存在，请选择其他用户名");
                return;
            }

            // 注册用户
            await signUpWithEmail(email, password, username);

            alert("注册成功！请检查邮箱验证邮件");
            router.push("/login");

        } catch (error: any) {
            alert(error.message || "注册失败");
        } finally {
            setLoading(false);
        }
    };

    const handleGithubSignUp = async () => {
        try {
            setLoading(true);
            await signInWithGitHub();
        } catch (error: any) {
            alert(error.message || "GitHub注册失败");
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-lg md:text-xl">注册</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                        创建您的账户
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">用户名 *</Label>
                            <Input
                                id="username"
                                placeholder="选择用户名"
                                required
                                onChange={(e) => setUsername(e.target.value)}
                                value={username}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">邮箱 *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">密码 *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="至少6位字符"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">确认密码 *</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="再次输入密码"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="image">头像 (可选)</Label>
                            <div className="flex items-end gap-4">
                                {imagePreview && (
                                    <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                                        <Image
                                            src={imagePreview}
                                            alt="头像预览"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="w-full"
                                    />
                                    {imagePreview && (
                                        <X
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setImage(null);
                                                setImagePreview(null);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            type="button"
                            className="w-full"
                            disabled={loading}
                            onClick={handleSignUp}
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                "创建账户"
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    或使用其他方式
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            disabled={loading}
                            onClick={handleGithubSignUp}
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
                            使用 GitHub 注册
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                    <div className="w-full border-t pt-4">
                        <p className="text-center text-xs text-muted-foreground">
                            已有账户？{" "}
                            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                                立即登录
                            </Link>
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}