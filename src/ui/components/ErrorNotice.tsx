export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      <strong>
        <span aria-hidden="true">⚠ </span>문제가 생겼어요
      </strong>
      <p>{message}</p>
    </div>
  );
}
