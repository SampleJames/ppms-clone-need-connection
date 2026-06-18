// import { useState, useEffect } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { LayoutDashboard, Settings, HardHat, Users } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { getAppSettings } from "@/lib/storage";
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarProvider,
//   SidebarTrigger,
// } from "@/components/ui/sidebar";
// import UserMenu from "@/components/auth/UserMenu";
// import ThemeCustomizer from "@/components/ThemeCustomizer"; // Imported the drawer

// const navItems = [
//   { to: "/", label: "Projects", icon: LayoutDashboard },
//   { to: "/collab", label: "Shared Projects", icon: Users },
//   { to: "/settings", label: "Settings", icon: Settings },
// ];

// function TopNavLayout({ children }: { children: React.ReactNode }) {
//   const location = useLocation();
//   return (
//     <div className="min-h-screen flex flex-col">
//       <header className="h-14 border-b bg-card flex items-center px-6 gap-4 shrink-0">
//         <div className="flex items-center mr-6">
//           <a href="/" className="flex items-center mr-6 hover:opacity-90 transition-opacity">
//             <img 
//               src="https://track.tsu.edu.ph/img/logo-header-regular.png" 
//               alt="PPMS Logo" 
//               className="h-9 w-auto object-contain"
//             />
//           </a>
//         </div>
        
//         <nav className="flex gap-1 flex-1">
//           {navItems.map((item) => (
//             <Link
//               key={item.to}
//               to={item.to}
//               className={cn(
//                 "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
//                 location.pathname === item.to || (item.to === "/collab" && location.pathname.startsWith("/collab"))
//                   ? "bg-primary text-primary-foreground"
//                   : "text-muted-foreground hover:bg-muted hover:text-foreground"
//               )}
//             >
//               <item.icon className="h-4 w-4" />
//               {item.label}
//             </Link>
//           ))}
//         </nav>
        
//         {/* Placed Customizer next to User Menu */}
//         <div className="flex items-center gap-3">
//           <ThemeCustomizer />
//           <UserMenu />
//         </div>
//       </header>
//       <main className="flex-1">{children}</main>
//     </div>
//   );
// }

// function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
//   const location = useLocation();
//   return (
//     <SidebarProvider>
//       <div className="min-h-screen flex w-full">
//         <Sidebar collapsible="icon">
//           <SidebarContent>
//             <div className="p-3 flex items-center gap-2 border-b border-sidebar-border mb-2">
//               <HardHat className="h-6 w-6 text-sidebar-primary shrink-0" />
//               <span className="text-lg font-bold tracking-tight text-sidebar-foreground truncate">CostPro</span>
//             </div>
//             <SidebarGroup>
//               <SidebarGroupContent>
//                 <SidebarMenu>
//                   {navItems.map((item) => (
//                     <SidebarMenuItem key={item.to}>
//                       <SidebarMenuButton
//                         asChild
//                         isActive={location.pathname === item.to || (item.to === "/" && location.pathname.startsWith("/project/")) || (item.to === "/collab" && location.pathname.startsWith("/collab"))}
//                       >
//                         <Link to={item.to}>
//                           <item.icon className="h-4 w-4" />
//                           <span>{item.label}</span>
//                         </Link>
//                       </SidebarMenuButton>
//                     </SidebarMenuItem>
//                   ))}
//                 </SidebarMenu>
//               </SidebarGroupContent>
//             </SidebarGroup>
//           </SidebarContent>
//         </Sidebar>
//         <div className="flex-1 flex flex-col min-w-0">
//           <header className="h-14 border-b bg-card flex items-center px-4 shrink-0 gap-2">
//             <SidebarTrigger />
            
//             {/* Placed Customizer next to User Menu in Sidebar layout */}
//             <div className="ml-auto flex items-center gap-3">
//               <ThemeCustomizer />
//               <UserMenu />
//             </div>
//           </header>
//           <main className="flex-1">{children}</main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }

// export default function AppLayout({ children }: { children: React.ReactNode }) {
//   const [layoutMode, setLayoutMode] = useState<'topnav' | 'sidebar'>(() => {
//     return getAppSettings().layoutMode || 'topnav';
//   });

//   useEffect(() => {
//     const handler = () => {
//       setLayoutMode(getAppSettings().layoutMode || 'topnav');
//     };
//     window.addEventListener('settingsChanged', handler);
//     return () => window.removeEventListener('settingsChanged', handler);
//   }, []);

//   if (layoutMode === 'sidebar') {
//     return <SidebarLayoutInner>{children}</SidebarLayoutInner>;
//   }
//   return <TopNavLayout>{children}</TopNavLayout>;
// }

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppSettings } from "@/lib/storage";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import UserMenu from "@/components/auth/UserMenu";

const navItems = [
  { to: "/", label: "Projects", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
];

function TopNavLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b bg-card flex items-center px-6 gap-4 shrink-0">
        <div className="flex items-center mr-6">
          <a href="/" className="flex items-center mr-6 hover:opacity-90 transition-opacity">
            <img 
              src="https://track.tsu.edu.ph/img/logo-header-regular.png" 
              alt="PPMS Logo" 
              className="h-9 w-auto object-contain"
            />
          </a>
        </div>
        
        <nav className="flex gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-3">
          <ThemeCustomizer />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            {/* Centered Logo Wrapper */}
            <div className="h-14 flex items-center justify-center border-b border-sidebar-border mb-2 px-2 shrink-0">
              <img 
                src="https://track.tsu.edu.ph/img/logo-header-regular.png" 
                alt="PPMS Logo" 
                className="h-7 w-auto max-w-full object-contain select-none"
              />
            </div>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.to || (item.to === "/" && location.pathname.startsWith("/project/"))}
                      >
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-4 shrink-0 gap-2">
            <SidebarTrigger />
            
            <div className="ml-auto flex items-center gap-3">
              <ThemeCustomizer />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [layoutMode, setLayoutMode] = useState<'topnav' | 'sidebar'>(() => {
    return getAppSettings().layoutMode || 'topnav';
  });

  useEffect(() => {
    const handler = () => {
      setLayoutMode(getAppSettings().layoutMode || 'topnav');
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  if (layoutMode === 'sidebar') {
    return <SidebarLayoutInner>{children}</SidebarLayoutInner>;
  }
  return <TopNavLayout>{children}</TopNavLayout>;
}