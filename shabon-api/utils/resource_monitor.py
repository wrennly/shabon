"""
Resource Monitor for Supabase & Render
Sends resource usage metrics to Discord webhook
"""
import os
import psutil
import requests
from datetime import datetime
from typing import Dict, Any, Optional

DISCORD_WEBHOOK_URL = os.getenv(
    "DISCORD_RESOURCE_WEBHOOK_URL",
    "https://discord.com/api/webhooks/1452419290086117619/Y6qDqTS2hcpHWakKQYVYaJ0uiZN7kLTHsoN1oEtNNJ5SNNXHCf5bfSkAzWoTqMrH6j7k"
)

def get_system_resources() -> Dict[str, Any]:
    """Get current system resource usage"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_total_gb = memory.total / (1024 ** 3)
        memory_used_gb = memory.used / (1024 ** 3)
        memory_percent = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_total_gb = disk.total / (1024 ** 3)
        disk_used_gb = disk.used / (1024 ** 3)
        disk_percent = disk.percent
        
        return {
            "cpu_percent": cpu_percent,
            "cpu_count": cpu_count,
            "memory_total_gb": round(memory_total_gb, 2),
            "memory_used_gb": round(memory_used_gb, 2),
            "memory_percent": memory_percent,
            "disk_total_gb": round(disk_total_gb, 2),
            "disk_used_gb": round(disk_used_gb, 2),
            "disk_percent": disk_percent,
        }
    except Exception as e:
        print(f"⚠️  Failed to get system resources: {e}")
        return {}


def get_database_stats(session) -> Dict[str, Any]:
    """Get database statistics from PostgreSQL (Supabase)"""
    try:
        from sqlmodel import text
        
        # Database size
        db_size_query = text("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   pg_database_size(current_database()) as size_bytes
        """)
        db_size_result = session.exec(db_size_query).first()
        
        # Table sizes
        table_sizes_query = text("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 5
        """)
        table_sizes = session.exec(table_sizes_query).all()
        
        # Vector table stats
        vector_stats_query = text("""
            SELECT 
                COUNT(*) as total_vectors,
                pg_size_pretty(pg_total_relation_size('conversation_memory')) as table_size
            FROM conversation_memory
        """)
        vector_stats = session.exec(vector_stats_query).first()
        
        # Connection count
        connection_query = text("""
            SELECT count(*) as connection_count
            FROM pg_stat_activity
            WHERE datname = current_database()
        """)
        connection_count = session.exec(connection_query).first()
        
        # Application statistics (users, mates, chats)
        app_stats_query = text("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
                (SELECT COUNT(*) FROM ai_mates WHERE is_deleted = false) as total_mates,
                (SELECT COUNT(*) FROM ai_mates WHERE is_public = true AND is_deleted = false) as public_mates,
                (SELECT COUNT(*) FROM chat_history) as total_chats,
                (SELECT COUNT(*) FROM chat_history WHERE created_at > NOW() - INTERVAL '24 hours') as chats_today,
                (SELECT COUNT(*) FROM chat_history WHERE created_at > NOW() - INTERVAL '7 days') as chats_this_week
        """)
        app_stats = session.exec(app_stats_query).first()
        
        # Index sizes (important for pgvector performance)
        index_sizes_query = text("""
            SELECT 
                indexname,
                pg_size_pretty(pg_relation_size(indexname::regclass)) as size
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY pg_relation_size(indexname::regclass) DESC
            LIMIT 3
        """)
        index_sizes = session.exec(index_sizes_query).all()
        
        return {
            "db_size": db_size_result[0] if db_size_result else "Unknown",
            "db_size_bytes": db_size_result[1] if db_size_result else 0,
            "top_tables": [
                {"name": row[1], "size": row[2]} 
                for row in table_sizes
            ],
            "vector_count": vector_stats[0] if vector_stats else 0,
            "vector_table_size": vector_stats[1] if vector_stats else "Unknown",
            "active_connections": connection_count[0] if connection_count else 0,
            "app_stats": {
                "total_users": app_stats[0] if app_stats else 0,
                "total_mates": app_stats[1] if app_stats else 0,
                "public_mates": app_stats[2] if app_stats else 0,
                "total_chats": app_stats[3] if app_stats else 0,
                "chats_today": app_stats[4] if app_stats else 0,
                "chats_this_week": app_stats[5] if app_stats else 0,
            },
            "top_indexes": [
                {"name": row[0], "size": row[1]}
                for row in index_sizes
            ]
        }
    except Exception as e:
        print(f"⚠️  Failed to get database stats: {e}")
        return {}


def send_resource_report_to_discord(
    system_resources: Dict[str, Any],
    db_stats: Dict[str, Any],
    custom_message: Optional[str] = None
):
    """Send resource usage report to Discord"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Build embed fields
        fields = []
        
        # System Resources
        if system_resources:
            fields.append({
                "name": "🖥️ System Resources",
                "value": (
                    f"**CPU**: {system_resources.get('cpu_percent', 0):.1f}% ({system_resources.get('cpu_count', 0)} cores)\n"
                    f"**Memory**: {system_resources.get('memory_used_gb', 0):.2f}GB / {system_resources.get('memory_total_gb', 0):.2f}GB ({system_resources.get('memory_percent', 0):.1f}%)\n"
                    f"**Disk**: {system_resources.get('disk_used_gb', 0):.2f}GB / {system_resources.get('disk_total_gb', 0):.2f}GB ({system_resources.get('disk_percent', 0):.1f}%)"
                ),
                "inline": False
            })
        
        # Database Stats
        if db_stats:
            fields.append({
                "name": "🗄️ Database (Supabase)",
                "value": (
                    f"**Total Size**: {db_stats.get('db_size', 'Unknown')}\n"
                    f"**Vectors**: {db_stats.get('vector_count', 0):,} ({db_stats.get('vector_table_size', 'Unknown')})\n"
                    f"**Connections**: {db_stats.get('active_connections', 0)}"
                ),
                "inline": False
            })
            
            # Application Statistics
            app_stats = db_stats.get('app_stats', {})
            if app_stats:
                fields.append({
                    "name": "👥 Application Stats",
                    "value": (
                        f"**Users**: {app_stats.get('total_users', 0):,}\n"
                        f"**Mates**: {app_stats.get('total_mates', 0):,} (Public: {app_stats.get('public_mates', 0):,})\n"
                        f"**Total Chats**: {app_stats.get('total_chats', 0):,}\n"
                        f"**Today**: {app_stats.get('chats_today', 0):,} | **This Week**: {app_stats.get('chats_this_week', 0):,}"
                    ),
                    "inline": False
                })
            
            # Top tables
            if db_stats.get('top_tables'):
                top_tables_text = "\n".join([
                    f"• {table['name']}: {table['size']}"
                    for table in db_stats['top_tables'][:3]
                ])
                fields.append({
                    "name": "📊 Top Tables",
                    "value": top_tables_text,
                    "inline": False
                })
            
            # Top indexes (important for vector search performance)
            if db_stats.get('top_indexes'):
                top_indexes_text = "\n".join([
                    f"• {idx['name']}: {idx['size']}"
                    for idx in db_stats['top_indexes'][:3]
                ])
                fields.append({
                    "name": "🔍 Top Indexes",
                    "value": top_indexes_text,
                    "inline": False
                })
            
            # Cost estimation
            cost_estimate = estimate_monthly_cost(db_stats)
            if cost_estimate:
                fields.append({
                    "name": "💰 Estimated Monthly Cost (Supabase)",
                    "value": (
                        f"**Base Plan**: ${cost_estimate.get('base_plan', 0):.2f}\n"
                        f"**Database Add-on**: ${cost_estimate.get('database_addon', 0):.2f}\n"
                        f"**Compute Add-on**: ${cost_estimate.get('compute_addon', 0):.2f}\n"
                        f"**Total**: ${cost_estimate.get('total_estimated', 0):.2f}/month"
                    ),
                    "inline": False
                })
        
        # Determine color based on memory usage
        memory_percent = system_resources.get('memory_percent', 0)
        if memory_percent > 80:
            color = 0xFF0000  # Red - Critical
        elif memory_percent > 60:
            color = 0xFFA500  # Orange - Warning
        else:
            color = 0x00FF00  # Green - OK
        
        payload = {
            "embeds": [{
                "title": "📊 Resource Monitor Report",
                "description": custom_message or f"System health check at {timestamp}",
                "color": color,
                "fields": fields,
                "footer": {
                    "text": "Shabon API Monitor"
                },
                "timestamp": datetime.utcnow().isoformat()
            }]
        }
        
        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json=payload,
            timeout=5
        )
        
        if response.status_code == 204:
            print(f"✅ Resource report sent to Discord")
        else:
            print(f"⚠️  Discord webhook returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Failed to send resource report to Discord: {e}")


def estimate_monthly_cost(db_stats: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimate monthly costs based on current usage
    Supabase Pro plan pricing: https://supabase.com/pricing
    """
    try:
        db_size_bytes = db_stats.get('db_size_bytes', 0)
        db_size_gb = db_size_bytes / (1024 ** 3)
        
        # Supabase Pro plan: $25/month includes 8GB database
        # Additional database: $0.125/GB/month
        base_cost = 25.0
        extra_db_gb = max(0, db_size_gb - 8)
        db_cost = extra_db_gb * 0.125
        
        # Estimate based on vector count (memory usage)
        # Jina v3 binary: 1024 bits = 128 bytes per vector
        vector_count = db_stats.get('vector_count', 0)
        vector_memory_gb = (vector_count * 128) / (1024 ** 3)
        
        # If memory usage exceeds 1GB (Pro plan default), might need compute add-on
        # Compute add-on: $10/month for 2GB RAM
        compute_cost = 0
        if vector_memory_gb > 1:
            compute_cost = 10.0
        
        total_estimated = base_cost + db_cost + compute_cost
        
        return {
            "base_plan": base_cost,
            "database_addon": round(db_cost, 2),
            "compute_addon": compute_cost,
            "total_estimated": round(total_estimated, 2),
            "db_size_gb": round(db_size_gb, 2),
            "vector_memory_gb": round(vector_memory_gb, 3),
        }
    except Exception as e:
        print(f"⚠️  Failed to estimate costs: {e}")
        return {}


def log_resource_usage(session=None, custom_message: Optional[str] = None):
    """
    Main function to log resource usage to Discord
    Call this periodically or on-demand
    """
    print("📊 Collecting resource usage...")
    
    system_resources = get_system_resources()
    db_stats = get_database_stats(session) if session else {}
    
    send_resource_report_to_discord(
        system_resources=system_resources,
        db_stats=db_stats,
        custom_message=custom_message
    )

