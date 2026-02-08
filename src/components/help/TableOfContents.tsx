import { useState, useEffect } from 'react';
import { BookOpen, Calculator, Upload, Download, Info, FileText, ChevronDown, Compass, Terminal, Layers, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const HELP_SECTIONS: Section[] = [
  { id: 'introduction', label: 'Introduction', icon: BookOpen },
  { id: 'analysis-modes', label: 'Analysis Modes', icon: Layers },
  { id: 'machine-presets', label: 'Machine Presets', icon: Settings2 },
  { id: 'how-to-use', label: 'How to Use', icon: Upload },
  { id: 'export-format', label: 'Export Format', icon: Download },
  { id: 'metrics-reference', label: 'Metrics Reference', icon: Calculator },
  { id: 'coordinate-system', label: 'Coordinate System', icon: Compass },
  { id: 'python-toolkit', label: 'Python Toolkit', icon: Terminal },
  { id: 'references', label: 'References', icon: FileText },
  { id: 'about', label: 'About', icon: Info },
];

interface TableOfContentsProps {
  sections?: Section[];
}

export function TableOfContents({ sections = HELP_SECTIONS }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const NavItems = ({ onClick }: { onClick?: (id: string) => void }) => (
    <>
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => {
            scrollToSection(id);
            onClick?.(id);
          }}
          className={cn(
            "flex items-center gap-2 w-full text-left text-sm py-2 px-3 rounded-md transition-colors",
            activeSection === id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block sticky top-8 self-start w-52 shrink-0">
        <nav className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            On this page
          </p>
          <NavItems />
        </nav>
      </aside>

      {/* Mobile collapsible dropdown */}
      <div className="lg:hidden mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-6 px-6 border-b">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                {(() => {
                  const activeItem = sections.find(s => s.id === activeSection);
                  const Icon = activeItem?.icon || BookOpen;
                  return (
                    <>
                      <Icon className="h-4 w-4" />
                      {activeItem?.label || 'Jump to section'}
                    </>
                  );
                })()}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            <NavItems onClick={() => setIsOpen(false)} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
