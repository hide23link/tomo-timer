interface Props {
  count: number
}

export function ViewerCount({ count }: Props) {
  if (count === 0) return null
  return <span className="viewer-count">👥 {count}</span>
}
