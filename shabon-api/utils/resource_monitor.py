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
    "DISCORD_WEBHOOK_URL",
    "https://discord.com/api/webhooks/1451815084467949622/0BJE0hrp4p7CntPHr-Oz_L3taIaqBz_5jeKEFeaWoCRB6FlQsX7rkVaL8YLXCNYosRXN"
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
    """Get database statistics from PostgreSQL"""
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

