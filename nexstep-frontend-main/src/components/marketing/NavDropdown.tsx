import { type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface DropdownItem { label: string; description: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; destination: string; }
interface NavDropdownProps { open: boolean; items: DropdownItem[]; onNavigate: (destination: string) => void; onMouseEnter: () => void; onMouseLeave: () => void; }

export function NavDropdown({ open, items, onNavigate, onMouseEnter, onMouseLeave }: NavDropdownProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="ns-dropdown"
          role="menu"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button" role="menuitem" onClick={() => onNavigate(item.destination)} className="ns-dropdown-item">
                <span className="ns-dropdown-icon"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                <span><b>{item.label}</b><small>{item.description}</small></span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NavDropdown;
