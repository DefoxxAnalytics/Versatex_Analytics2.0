"""
Utility functions for authentication
"""
from .models import AuditLog


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """Get user agent from request"""
    return request.META.get('HTTP_USER_AGENT', '')


def log_action(user, action, resource, resource_id='', details=None, request=None):
    """
    Log user action to audit log
    """
    if not hasattr(user, 'profile'):
        return None
    
    log_data = {
        'user': user,
        'organization': user.profile.organization,
        'action': action,
        'resource': resource,
        'resource_id': resource_id,
        'details': details or {},
    }
    
    if request:
        log_data['ip_address'] = get_client_ip(request)
        log_data['user_agent'] = get_user_agent(request)
    
    return AuditLog.objects.create(**log_data)
