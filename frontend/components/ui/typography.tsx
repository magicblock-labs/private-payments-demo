export function H1({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}>
      {children}
    </h1>
  );
}

export function H2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0 ${className}`}>
      {children}
    </h2>
  );
}

export function H3({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`scroll-m-20 py-1 text-xl font-semibold tracking-tight first:mt-0 ${className}`}>{children}</h3>;
}

export function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-muted-foreground text-sm ${className}`}>{children}</p>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className='text-muted-foreground text-xl'>{children}</p>;
}

export function Large({ children }: { children: React.ReactNode }) {
  return <div className='text-lg font-semibold'>{children}</div>;
}
