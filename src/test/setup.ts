import '@testing-library/jest-dom/vitest';

// React 19 + act(): garante o ambiente de teste para atualizações de estado.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
