import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import DropdownMenu, {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { RiHomeSmile2Line } from 'react-icons/ri';

const FloatingNavbar = () => {
  const navigationItems = [
    { name: 'Jobs', href: '/jobs' },
    { name: 'About', href: '/about' },
    { name: 'Torem', href: '/torem' },
    { name: 'Lorem', href: '/lorem' },
    { name: 'Sorem', href: '/sorem' },
  ];

  return (
    <nav className="fixed top-4 left-4 right-4 z-50">
      <div className="mx-auto max-w-[1300px] px-6">
        <div className="relative backdrop-blur-xl border border-white/20 shadow-2xl text-inter bg-[#00000033] rounded-3xl py-4">
          <div className="relative flex items-center justify-between px-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center text-[24px] gap-[5px]">
                <RiHomeSmile2Line className="text-fade" />
                <p className="text-[#1C1C1C] font-medium">Talent Match</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="relative group px-4 py-2 text-gray-700 font-medium transition-all duration-300"
                >
                  <span className="relative z-10">{item.name}</span>
                  <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-linear-to-r from-fade to-button group-hover:w-full group-hover:left-0 transition-all"></div>
                  <div className="absolute -top-1 left-1/2 w-1 h-1 bg-button rounded-full opacity-0 group-hover:opacity-100 transform -translate-x-1/2 transition-all"></div>
                </Link>
              ))}
            </div>

            {/* Icons / Mobile Menu Trigger */}
            <div className="flex items-center space-x-3">
              <Link to="/register">
                <button className="hidden py-[13px] px-[54px] text-[#1C1C1C] bg-[#ADED9A] lg:flex rounded-xl">
                  Register
                </button>
              </Link>

              {/* Mobile: Dropdown trigger */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button
                      className="p-2 rounded-md  shadow-sm"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5 text-gray-700" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56 ">
                    <DropdownMenuLabel className="">
                      Navigation
                    </DropdownMenuLabel>

                    {navigationItems.map((item) => (
                      <DropdownMenuItem key={item.name}>
                        <Link className="w-full" to={item.href}>
                          {' '}
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem>
                      <Link className="w-full" to="/login">
                        Login
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link className="w-full" to="/logout">
                        Logout
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default FloatingNavbar;
