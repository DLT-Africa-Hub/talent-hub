import { Link } from 'react-router-dom';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import { FaTelegramPlane } from 'react-icons/fa';

const Footer = () => {
  const productLinks = [
    { name: 'Korem ipsum', href: '/korem' },
    { name: 'Sorem ipsum', href: '/sorem' },
    { name: 'Vorem ipsum', href: '/vorem' },
    { name: 'Dorem ipsum', href: '/dorem' },
  ];

  const supportLinks = [
    { name: 'Sorem ipsum', href: '/support-sorem' },
    { name: 'Sorem ipsum', href: '/support-sorem-2' },
    { name: 'Qorem ipsum', href: '/qorem' },
    { name: 'Forem ipsum', href: '/forem' },
  ];

  return (
    <footer className="w-full pt-16 lg:pt-20 px-4 lg:px-6 font-inter bg-white relative overflow-hidden">
      {/* Footer Container with green background and rounded corners */}
      <div className="max-w-[1300px] mx-auto">
        <div className="bg-[#ADED9A] bg-onBoard bg-center rounded-[50px] px-8 lg:px-16 py-12 lg:py-16 relative overflow-hidden min-h-[503px] flex flex-col justify-between">
          {/* Background overlay for subtle effect */}
          <div className="absolute inset-0 bg-[#ADED9A]/50 pointer-events-none"></div>

          {/* Main Footer Content */}
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-16 mb-12 lg:mb-16">
              {/* Left Section - Brand */}
              <div className="flex flex-col gap-6 max-w-[450px]">
                {/* Logo */}
                <div className="flex items-center text-[24px] gap-[5px]">
                  <RiHomeSmile2Line className="text-[#1C1C1C]" />
                  <p className="text-[#1C1C1C] font-semibold">Talent Match</p>
                </div>

                {/* Description */}
                <p className="text-[#1C1C1C] text-[14px] lg:text-[16px] leading-relaxed">
                  The modern platform connecting skilled professionals with
                  companies for full-time, contract, and gig opportunities.
                </p>

                {/* Social Icons */}
                <div className="flex items-center gap-4">
                  <Link
                    to="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1C1C1C] hover:text-[#1C1C1C]/70 transition-colors duration-200"
                  >
                    <FaXTwitter className="w-5 h-5" />
                  </Link>
                  <Link
                    to="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1C1C1C] hover:text-[#1C1C1C]/70 transition-colors duration-200"
                  >
                    <FaLinkedin className="w-5 h-5" />
                  </Link>
                  <Link
                    to="https://telegram.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1C1C1C] hover:text-[#1C1C1C]/70 transition-colors duration-200"
                  >
                    <FaTelegramPlane className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Right Section - Links */}
              <div className="flex flex-col sm:flex-row gap-12 lg:gap-20">
                {/* Product Column */}
                <div className="flex flex-col gap-6">
                  <h3 className="text-[#1C1C1C] text-[18px] lg:text-[20px] font-semibold">
                    Product
                  </h3>
                  <div className="flex flex-col gap-3">
                    {productLinks.map((link, index) => (
                      <Link
                        key={index}
                        to={link.href}
                        className="text-[#1C1C1C] text-[14px] lg:text-[16px] hover:text-[#1C1C1C]/70 transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Support Column */}
                <div className="flex flex-col gap-6">
                  <h3 className="text-[#1C1C1C] text-[18px] lg:text-[20px] font-semibold">
                    Support
                  </h3>
                  <div className="flex flex-col gap-3">
                    {supportLinks.map((link, index) => (
                      <Link
                        key={index}
                        to={link.href}
                        className="text-[#1C1C1C] text-[14px] lg:text-[16px] hover:text-[#1C1C1C]/70 transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Copyright and Legal Links */}
          <div className="relative z-10">
            {/* Divider */}
            <div className="w-full h-px bg-[#1C1C1C]/20 mb-6"></div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Copyright - Orange color */}
              <p className="text-[#FF8C00] text-[14px] lg:text-[16px] font-medium">
                @ 2025 Talent Match. All rights reserved.
              </p>

              {/* Legal Links */}
              <div className="flex items-center gap-6">
                <Link
                  to="/privacy"
                  className="text-[#1C1C1C] text-[14px] lg:text-[16px] hover:text-[#1C1C1C]/70 transition-colors duration-200 underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="text-[#1C1C1C] text-[14px] lg:text-[16px] hover:text-[#1C1C1C]/70 transition-colors duration-200 underline"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Large Talent Match Logo/Text at bottom with subtle blur */}
        <div className="flex items-center justify-center gap-[33.82px] mt-16 lg:mt-20 opacity-100 relative">
          <div className="flex items-center gap-[33.82px] relative">
            {/* Large Logo Icon with subtle blur */}
            <RiHomeSmile2Line
              className="w-[196px] h-[196px] text-[#D9D9D9] relative z-0"
              style={{
                filter: 'blur(3px) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1))',
              }}
            />

            {/* Large Text with subtle blur effect */}
            <h2
              className="text-[#D9D9D9] text-[120px] lg:text-[150px] font-bold leading-none relative z-0"
              style={{
                filter: 'blur(3px) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1))',
              }}
            >
              Talent Match
            </h2>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
