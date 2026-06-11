// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useAuth } from "@/contexts/AuthContext";
// import { toast } from "@/hooks/use-toast";
// import { Users } from "lucide-react";

// export default function SignInScreen() {
//   const { signIn, signUp, signInWithGoogle } = useAuth();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [name, setName] = useState("");
//   const [busy, setBusy] = useState(false);

//   const wrap = async (fn: () => Promise<void>) => {
//     setBusy(true);
//     try {
//       await fn();
//     } catch (e) {
//       toast({ title: "Auth error", description: (e as Error).message, variant: "destructive" });
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
// //     <div className="min-h-[70vh] flex items-center justify-center p-6">
// //       <Card className="w-full max-w-md">
// //         <CardHeader className="text-center">
// //        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
// //   <img 
// //     src="/favicon.png" 
// //     alt="Logo" 
// //     className="h-full w-full object-contain select-none" 
// //   />
// // </div>
// //           <CardTitle>Sign in to PPMS</CardTitle>
// //           <CardDescription>Real-time collaborative projects with your team.</CardDescription>
// //         </CardHeader>
// //         <CardContent>
// //           <Tabs defaultValue="signin">
// //             <TabsList className="grid grid-cols-2 mb-4">
// //               <TabsTrigger value="signin">Sign In</TabsTrigger>
// //               <TabsTrigger value="signup">Sign Up</TabsTrigger>
// //             </TabsList>
// //             <TabsContent value="signin" className="space-y-3">
// //               <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
// //               <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
// //               <Button className="w-full" disabled={busy} onClick={() => wrap(() => signIn(email, password))}>
// //                 Sign In
// //               </Button>
// //             </TabsContent>
// //             <TabsContent value="signup" className="space-y-3">
// //               <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
// //               <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
// //               <Input placeholder="Password (min 6)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
// //               <Button className="w-full" disabled={busy} onClick={() => wrap(() => signUp(email, password, name))}>
// //                 Create Account
// //               </Button>
// //             </TabsContent>
// //           </Tabs>
// //           <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
// //             <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
// //           </div>
// //           <Button variant="outline" className="w-full" disabled={busy} onClick={() => wrap(signInWithGoogle)}>
// //             Continue with Google
// //           </Button> 
// //         </CardContent>
// //       </Card>


// //     </div>

// <div className="min-h-[70vh] flex items-center justify-center p-6">
//   <Card className="w-full max-w-md shadow-sm border">
//     <CardHeader className="text-center pb-6">
//       <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
//         <img 
//           src="/favicon.png" 
//           alt="Logo" 
//           className="h-10 w-10 object-contain select-none" 
//         />
//       </div>
//       <CardTitle className="text-2xl font-bold">Sign in to PPMS</CardTitle>
//       <CardDescription className="text-base">
//         Real-time collaborative projects with your team.
//       </CardDescription>
//     </CardHeader>
//     <CardContent>
//       <Button 
//         variant="outline" 
//         className="w-full h-12 text-base font-medium gap-3 hover:bg-slate-50" 
//         disabled={busy} 
//         onClick={() => wrap(signInWithGoogle)}
//       >
//         {/* Google 'G' Logo SVG */}
//         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
//           <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//           <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//           <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//           <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//         </svg>
//         Sign in with Google
//       </Button> 
//     </CardContent>
//   </Card>
// </div>
//   );
// }

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function SignInScreen() {
  const { signInWithMicrosoft, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  // Reusable login handler
  const handleLogin = async (provider: 'microsoft' | 'google') => {
    setBusy(true);
    try {
      if (provider === 'microsoft') {
        await signInWithMicrosoft();
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      toast({ 
        title: "Sign in failed", 
        description: (err as Error).message, 
        variant: "destructive" 
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 relative selection:bg-[#7b1113] selection:text-white transition-colors duration-300">
      {/* Subtle modern grid background pattern - switches opacity in dark mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* The Login Card */}
      <Card className="w-full max-w-md shadow-xl border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md relative z-10 rounded-2xl overflow-hidden transition-all duration-300">
        {/* Smooth Gradient TSU Maroon Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7b1113] via-[#9e1619] to-[#7b1113]" /> 

        <CardHeader className="text-center pb-2 pt-10 px-8">
          {/* Logo container adjusts colors gracefully */}
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center mb-6 border border-slate-100 dark:border-zinc-700 p-3 shadow-sm group">
            <img 
              src="/favicon.png" 
              alt="Logo" 
              className="h-full w-full object-contain select-none transition-transform duration-300 group-hover:scale-105" 
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
            Welcome to PPMS
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-zinc-400 mt-2 text-base">
            Sign in to manage your  projects.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-10 pt-6 px-8">
          {/* Microsoft Button */}
          <Button 
            variant="outline" 
            className="w-full h-[52px] text-base font-medium gap-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 shadow-sm hover:shadow transition-all rounded-xl" 
            disabled={busy} 
            onClick={() => handleLogin('microsoft')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
              <path fill="#f25022" d="M1 1h9v9H1z"/>
              <path fill="#00a4ef" d="M1 11h9v9H1z"/>
              <path fill="#7fba00" d="M11 1h9v9h-9z"/>
              <path fill="#ffb900" d="M11 11h9v9h-9z"/>
            </svg>
            Sign in with Microsoft
          </Button> 
        </CardContent>
      </Card>
    </div>
  );
}