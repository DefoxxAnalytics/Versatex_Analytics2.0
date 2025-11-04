"""
Analytics API views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.authentication.utils import log_action
from .services import AnalyticsService


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_stats(request):
    """
    Get overview statistics
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_overview_stats()
    
    log_action(
        user=request.user,
        action='view',
        resource='analytics_overview',
        request=request
    )
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spend_by_category(request):
    """
    Get spend breakdown by category
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_spend_by_category()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spend_by_supplier(request):
    """
    Get spend breakdown by supplier
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_spend_by_supplier()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_trend(request):
    """
    Get monthly spend trend
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    months = int(request.query_params.get('months', 12))
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_monthly_trend(months=months)
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pareto_analysis(request):
    """
    Get Pareto analysis
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_pareto_analysis()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tail_spend_analysis(request):
    """
    Get tail spend analysis
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    threshold = int(request.query_params.get('threshold', 20))
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_tail_spend_analysis(threshold_percentage=threshold)
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spend_stratification(request):
    """
    Get spend stratification (Kraljic Matrix)
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_spend_stratification()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seasonality_analysis(request):
    """
    Get seasonality analysis
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_seasonality_analysis()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def year_over_year(request):
    """
    Get year over year comparison
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_year_over_year_comparison()
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consolidation_opportunities(request):
    """
    Get supplier consolidation opportunities
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=400)
    
    service = AnalyticsService(request.user.profile.organization)
    data = service.get_supplier_consolidation_opportunities()
    
    return Response(data)
