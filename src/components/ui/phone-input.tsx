import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Country {
  code: string;
  name: string;
  nativeName: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  mask?: string;
}

const countries: Country[] = [
  { code: "AL", name: "Albania", nativeName: "Shqipëri", dialCode: "+355", flag: "🇦🇱", placeholder: "00 000 0000" },
  { code: "AM", name: "Armenia", nativeName: "Հայdelays", dialCode: "+374", flag: "🇦🇲", placeholder: "00 000000" },
  { code: "AT", name: "Austria", nativeName: "Österreich", dialCode: "+43", flag: "🇦🇹", placeholder: "000 000000" },
  { code: "AZ", name: "Azerbaijan", nativeName: "Azərbaycan", dialCode: "+994", flag: "🇦🇿", placeholder: "00 000 00 00" },
  { code: "BY", name: "Belarus", nativeName: "Беларусь", dialCode: "+375", flag: "🇧🇾", placeholder: "(00) 000-00-00", mask: "(XX) XXX-XX-XX" },
  { code: "BE", name: "Belgium", nativeName: "België", dialCode: "+32", flag: "🇧🇪", placeholder: "000 00 00 00" },
  { code: "BA", name: "Bosnia", nativeName: "Bosna", dialCode: "+387", flag: "🇧🇦", placeholder: "00 000 000" },
  { code: "BG", name: "Bulgaria", nativeName: "България", dialCode: "+359", flag: "🇧🇬", placeholder: "00 000 0000" },
  { code: "HR", name: "Croatia", nativeName: "Hrvatska", dialCode: "+385", flag: "🇭🇷", placeholder: "00 000 0000" },
  { code: "CY", name: "Cyprus", nativeName: "Κύπρος", dialCode: "+357", flag: "🇨🇾", placeholder: "00 000000" },
  { code: "CZ", name: "Czechia", nativeName: "Česko", dialCode: "+420", flag: "🇨🇿", placeholder: "000 000 000" },
  { code: "DK", name: "Denmark", nativeName: "Danmark", dialCode: "+45", flag: "🇩🇰", placeholder: "00 00 00 00" },
  { code: "EE", name: "Estonia", nativeName: "Eesti", dialCode: "+372", flag: "🇪🇪", placeholder: "0000 0000" },
  { code: "FI", name: "Finland", nativeName: "Suomi", dialCode: "+358", flag: "🇫🇮", placeholder: "00 0000000" },
  { code: "FR", name: "France", nativeName: "France", dialCode: "+33", flag: "🇫🇷", placeholder: "0 00 00 00 00" },
  { code: "GE", name: "Georgia", nativeName: "საქართველო", dialCode: "+995", flag: "🇬🇪", placeholder: "000 00 00 00" },
  { code: "DE", name: "Germany", nativeName: "Deutschland", dialCode: "+49", flag: "🇩🇪", placeholder: "000 0000000" },
  { code: "GR", name: "Greece", nativeName: "Ελλάδα", dialCode: "+30", flag: "🇬🇷", placeholder: "000 000 0000" },
  { code: "HU", name: "Hungary", nativeName: "Magyarország", dialCode: "+36", flag: "🇭🇺", placeholder: "00 000 0000" },
  { code: "IS", name: "Iceland", nativeName: "Ísland", dialCode: "+354", flag: "🇮🇸", placeholder: "000 0000" },
  { code: "IE", name: "Ireland", nativeName: "Éire", dialCode: "+353", flag: "🇮🇪", placeholder: "00 000 0000" },
  { code: "IT", name: "Italy", nativeName: "Italia", dialCode: "+39", flag: "🇮🇹", placeholder: "000 000 0000" },
  { code: "KZ", name: "Kazakhstan", nativeName: "Қазақстан", dialCode: "+7", flag: "🇰🇿", placeholder: "(000) 000-00-00" },
  { code: "LV", name: "Latvia", nativeName: "Latvija", dialCode: "+371", flag: "🇱🇻", placeholder: "00 000 000" },
  { code: "LT", name: "Lithuania", nativeName: "Lietuva", dialCode: "+370", flag: "🇱🇹", placeholder: "000 00000" },
  { code: "LU", name: "Luxembourg", nativeName: "Lëtzebuerg", dialCode: "+352", flag: "🇱🇺", placeholder: "000 000 000" },
  { code: "MD", name: "Moldova", nativeName: "Moldova", dialCode: "+373", flag: "🇲🇩", placeholder: "000 00 000" },
  { code: "ME", name: "Montenegro", nativeName: "Crna Gora", dialCode: "+382", flag: "🇲🇪", placeholder: "00 000 000" },
  { code: "NL", name: "Netherlands", nativeName: "Nederland", dialCode: "+31", flag: "🇳🇱", placeholder: "0 00000000" },
  { code: "MK", name: "North Macedonia", nativeName: "Северна Македонија", dialCode: "+389", flag: "🇲🇰", placeholder: "00 000 000" },
  { code: "NO", name: "Norway", nativeName: "Norge", dialCode: "+47", flag: "🇳🇴", placeholder: "000 00 000" },
  { code: "PL", name: "Poland", nativeName: "Polska", dialCode: "+48", flag: "🇵🇱", placeholder: "000 000 000" },
  { code: "PT", name: "Portugal", nativeName: "Portugal", dialCode: "+351", flag: "🇵🇹", placeholder: "000 000 000" },
  { code: "RO", name: "Romania", nativeName: "România", dialCode: "+40", flag: "🇷🇴", placeholder: "000 000 000" },
  { code: "RU", name: "Russia", nativeName: "Россия", dialCode: "+7", flag: "🇷🇺", placeholder: "(000) 000-00-00" },
  { code: "RS", name: "Serbia", nativeName: "Србија", dialCode: "+381", flag: "🇷🇸", placeholder: "00 000 0000" },
  { code: "SK", name: "Slovakia", nativeName: "Slovensko", dialCode: "+421", flag: "🇸🇰", placeholder: "000 000 000" },
  { code: "SI", name: "Slovenia", nativeName: "Slovenija", dialCode: "+386", flag: "🇸🇮", placeholder: "00 000 000" },
  { code: "ES", name: "Spain", nativeName: "España", dialCode: "+34", flag: "🇪🇸", placeholder: "000 00 00 00" },
  { code: "SE", name: "Sweden", nativeName: "Sverige", dialCode: "+46", flag: "🇸🇪", placeholder: "00 000 00 00" },
  { code: "CH", name: "Switzerland", nativeName: "Schweiz", dialCode: "+41", flag: "🇨🇭", placeholder: "00 000 00 00" },
  { code: "TR", name: "Turkey", nativeName: "Türkiye", dialCode: "+90", flag: "🇹🇷", placeholder: "000 000 0000" },
  { code: "UA", name: "Ukraine", nativeName: "Україна", dialCode: "+380", flag: "🇺🇦", placeholder: "00 000 0000" },
  { code: "GB", name: "United Kingdom", nativeName: "United Kingdom", dialCode: "+44", flag: "🇬🇧", placeholder: "0000 000000" },
  { code: "US", name: "United States", nativeName: "United States", dialCode: "+1", flag: "🇺🇸", placeholder: "(000) 000-0000" },
  { code: "UZ", name: "Uzbekistan", nativeName: "Oʻzbekiston", dialCode: "+998", flag: "🇺🇿", placeholder: "00 000 00 00" },
];

// Sort countries alphabetically by name
const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));

// Find Belarus as default
const defaultCountry = countries.find(c => c.code === "BY") || countries[0];

// Format phone number according to mask pattern
function formatPhoneNumber(value: string, country: Country): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // For Belarus: (XX) XXX-XX-XX
  if (country.code === "BY") {
    let formatted = '';
    if (digits.length > 0) {
      formatted = '(' + digits.substring(0, 2);
    }
    if (digits.length >= 2) {
      formatted += ') ';
    }
    if (digits.length > 2) {
      formatted += digits.substring(2, 5);
    }
    if (digits.length > 5) {
      formatted += '-' + digits.substring(5, 7);
    }
    if (digits.length > 7) {
      formatted += '-' + digits.substring(7, 9);
    }
    return formatted;
  }
  
  // For Russia/Kazakhstan: (XXX) XXX-XX-XX
  if (country.code === "RU" || country.code === "KZ") {
    let formatted = '';
    if (digits.length > 0) {
      formatted = '(' + digits.substring(0, 3);
    }
    if (digits.length >= 3) {
      formatted += ') ';
    }
    if (digits.length > 3) {
      formatted += digits.substring(3, 6);
    }
    if (digits.length > 6) {
      formatted += '-' + digits.substring(6, 8);
    }
    if (digits.length > 8) {
      formatted += '-' + digits.substring(8, 10);
    }
    return formatted;
  }
  
  // Default: no formatting
  return digits;
}

// Get max digits allowed for a country
function getMaxDigits(country: Country): number {
  if (country.code === "BY") return 9;
  if (country.code === "RU" || country.code === "KZ") return 10;
  return 15;
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string, fullNumber: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function PhoneInput({ value = "", onChange, className, id, disabled }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = React.useState(() => {
    if (value) {
      return formatPhoneNumber(value, defaultCountry);
    }
    return '';
  });

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    const digits = phoneNumber.replace(/\D/g, '');
    const formatted = formatPhoneNumber(digits, country);
    setPhoneNumber(formatted);
    const fullNumber = `${country.dialCode}${digits}`;
    onChange?.(formatted, fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digits = inputValue.replace(/\D/g, '');
    const maxDigits = getMaxDigits(selectedCountry);
    const limitedDigits = digits.substring(0, maxDigits);
    const formatted = formatPhoneNumber(limitedDigits, selectedCountry);
    setPhoneNumber(formatted);
    const fullNumber = `${selectedCountry.dialCode}${limitedDigits}`;
    onChange?.(formatted, fullNumber);
  };

  return (
    <div className={cn("flex gap-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-auto px-3 justify-between rounded-r-none border-r-0 bg-background hover:bg-muted"
          >
            <span className="text-lg mr-1">{selectedCountry.flag}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 z-50 bg-popover" align="start">
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {sortedCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                    selectedCountry.code === country.code && "bg-accent"
                  )}
                >
                  <span className="flex-1 text-left">
                    {country.name} ({country.nativeName})
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>{country.dialCode}</span>
                    <span className="text-lg">{country.flag}</span>
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground">
          {selectedCountry.dialCode}
        </span>
        <Input
          id={id}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={selectedCountry.placeholder}
          disabled={disabled}
          className={cn(
            "rounded-l-none",
            selectedCountry.dialCode.length > 3 ? "pl-14" : "pl-12"
          )}
        />
      </div>
    </div>
  );
}

export { countries, defaultCountry };
export type { Country };
