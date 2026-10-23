import Box from '@mui/material/Box';

/**
 * Deterministic gradient avatar for an address (no external avatar service). Lives in shared/ so
 * Mini can use it without importing the standard app's wallet module (and its branded code).
 */
export function AddressAvatar({ address, size = 20 }: { address: string; size?: number }) {
  const h = parseInt(address.slice(-6), 16) % 360;
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `conic-gradient(from 90deg, hsl(${h} 70% 60%), hsl(${(h + 90) % 360} 70% 55%), hsl(${(h + 200) % 360} 70% 60%), hsl(${h} 70% 60%))`,
      }}
    />
  );
}
