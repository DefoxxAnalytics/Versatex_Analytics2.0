"""
URL patterns for analytics
"""
from django.urls import path
from . import views

urlpatterns = [
    path('overview/', views.overview_stats, name='overview-stats'),
    path('spend-by-category/', views.spend_by_category, name='spend-by-category'),
    path('spend-by-supplier/', views.spend_by_supplier, name='spend-by-supplier'),
    path('monthly-trend/', views.monthly_trend, name='monthly-trend'),
    path('pareto/', views.pareto_analysis, name='pareto-analysis'),
    path('tail-spend/', views.tail_spend_analysis, name='tail-spend'),
    path('stratification/', views.spend_stratification, name='stratification'),
    path('seasonality/', views.seasonality_analysis, name='seasonality'),
    path('year-over-year/', views.year_over_year, name='year-over-year'),
    path('consolidation/', views.consolidation_opportunities, name='consolidation'),
]
