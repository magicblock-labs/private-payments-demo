export function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className='scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0'>
      {children}
    </h1>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0'>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className='scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0'>
      {children}
    </h3>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <p className='text-muted-foreground text-sm'>{children}</p>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className='text-muted-foreground text-xl'>{children}</p>;
}

export function Large({ children }: { children: React.ReactNode }) {
  return <div className='text-lg font-semibold'>{children}</div>;
}
