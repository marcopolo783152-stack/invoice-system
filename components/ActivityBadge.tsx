import styles from './ActivityBadge.module.css';
export default function ActivityBadge({ count }: { count: number }) {
 if (!Number.isFinite(count) || count <= 0) return null;
 return <span className={styles.badge} aria-label={count + ' items needing attention'}>{count > 99 ? '99+' : count}</span>;
}
