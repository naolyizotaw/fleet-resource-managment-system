import React from 'react';
import { Wrench, Calendar, User, Package, DollarSign, Clock } from 'lucide-react';

const WorkOrderPrintTemplate = ({ workOrder }) => {
    if (!workOrder) return null;

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="print-template" style={{ display: 'none' }}>
            <style>{`
        @media print {
          .print-template {
            display: block !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-template, .print-template * {
            visibility: visible;
          }
          
          .print-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            background: white;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

            <div className="print-content" style={{
                fontFamily: 'Arial, sans-serif',
                color: '#1f2937',
                maxWidth: '210mm',
                margin: '0 auto'
            }}>
                {/* Company Header */}
                <div style={{
                    borderBottom: '4px solid #2563eb',
                    paddingBottom: '20px',
                    marginBottom: '30px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: '#1f2937',
                                margin: '0 0 8px 0',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                FleetPro Management
                            </h1>
                            <p style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: '0',
                                textTransform: 'uppercase',
                                letterSpacing: '2px'
                            }}>
                                Fleet Resource Management System
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                marginBottom: '4px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                Work Order
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: '#2563eb'
                            }}>
                                {workOrder.workOrderNumber}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Order Info & Status */}
                <div className="no-break" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Work Order Information
                        </h3>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Status:</td>
                                    <td style={{ padding: '6px 0', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                        {workOrder.status?.replace('_', ' ')}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Priority:</td>
                                    <td style={{ padding: '6px 0', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                        {workOrder.priority}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Category:</td>
                                    <td style={{ padding: '6px 0' }}>{workOrder.category || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Created:</td>
                                    <td style={{ padding: '6px 0' }}>{formatDate(workOrder.createdAt)}</td>
                                </tr>
                                {workOrder.startedDate && (
                                    <tr>
                                        <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Started:</td>
                                        <td style={{ padding: '6px 0' }}>{formatDate(workOrder.startedDate)}</td>
                                    </tr>
                                )}
                                {workOrder.completedDate && (
                                    <tr>
                                        <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Completed:</td>
                                        <td style={{ padding: '6px 0' }}>{formatDate(workOrder.completedDate)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Vehicle Information
                        </h3>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Plate Number:</td>
                                    <td style={{ padding: '6px 0', fontWeight: 'bold' }}>
                                        {workOrder.vehicleId?.plateNumber || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Make/Model:</td>
                                    <td style={{ padding: '6px 0' }}>
                                        {workOrder.vehicleId?.manufacturer} {workOrder.vehicleId?.model}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Year:</td>
                                    <td style={{ padding: '6px 0' }}>{workOrder.vehicleId?.year || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', color: '#6b7280', fontWeight: '600' }}>Current KM:</td>
                                    <td style={{ padding: '6px 0' }}>
                                        {workOrder.vehicleId?.currentKm?.toLocaleString() || '-'} km
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Description */}
                <div className="no-break" style={{ marginBottom: '30px' }}>
                    <h3 style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '12px'
                    }}>
                        Description
                    </h3>
                    <p style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#374151',
                        margin: '0',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                    }}>
                        {workOrder.description}
                    </p>
                </div>

                {/* Assigned Mechanics */}
                {workOrder.assignedMechanics && workOrder.assignedMechanics.length > 0 && (
                    <div className="no-break" style={{ marginBottom: '30px' }}>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Assigned Mechanics
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {workOrder.assignedMechanics.map((mechanic, idx) => (
                                <div key={idx} style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#1e40af'
                                }}>
                                    {mechanic.fullName || mechanic.username}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Spare Parts Used */}
                {workOrder.spareParts && workOrder.spareParts.length > 0 && (
                    <div className="no-break" style={{ marginBottom: '30px' }}>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Spare Parts Used
                        </h3>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px'
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Part Name
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Quantity
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Unit Cost
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Total Cost
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrder.spareParts.map((part, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '10px 12px' }}>{part.itemName}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{part.quantity}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            ETB {part.unitCost?.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                                            ETB {part.totalCost?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                                    <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>
                                        Parts Subtotal:
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb' }}>
                                        ETB {workOrder.totalPartsCost?.toLocaleString() || '0'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Labor Costs */}
                {workOrder.laborCosts && workOrder.laborCosts.length > 0 && (
                    <div className="no-break" style={{ marginBottom: '30px' }}>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Labor Costs
                        </h3>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px'
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Mechanic
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Description
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Hours
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Rate/Hour
                                    </th>
                                    <th style={{
                                        padding: '10px 12px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#374151',
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Total Cost
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrder.laborCosts.map((labor, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            {labor.mechanicId?.fullName || labor.mechanicId?.username || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6b7280' }}>
                                            {labor.description || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{labor.hours}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            ETB {labor.hourlyRate?.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                                            ETB {labor.totalCost?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                                    <td colSpan="4" style={{ padding: '12px', textAlign: 'right' }}>
                                        Labor Subtotal:
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb' }}>
                                        ETB {workOrder.totalLaborCost?.toLocaleString() || '0'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Total Cost Summary */}
                <div className="no-break" style={{
                    marginBottom: '30px',
                    padding: '20px',
                    backgroundColor: '#eff6ff',
                    border: '2px solid #2563eb',
                    borderRadius: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                            Parts Cost:
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                            ETB {workOrder.totalPartsCost?.toLocaleString() || '0'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                            Labor Cost:
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                            ETB {workOrder.totalLaborCost?.toLocaleString() || '0'}
                        </span>
                    </div>
                    <div style={{
                        borderTop: '2px solid #2563eb',
                        paddingTop: '12px',
                        marginTop: '12px',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                            TOTAL COST:
                        </span>
                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb' }}>
                            ETB {workOrder.totalCost?.toLocaleString() || '0'}
                        </span>
                    </div>
                </div>

                {/* Progress Notes */}
                {workOrder.progressNotes && workOrder.progressNotes.length > 0 && (
                    <div className="no-break" style={{ marginBottom: '30px' }}>
                        <h3 style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>
                            Progress Timeline
                        </h3>
                        <div style={{ position: 'relative', paddingLeft: '24px' }}>
                            {/* Timeline line */}
                            <div style={{
                                position: 'absolute',
                                left: '7px',
                                top: '8px',
                                bottom: '8px',
                                width: '2px',
                                backgroundColor: '#e5e7eb'
                            }} />

                            {workOrder.progressNotes.map((note, idx) => (
                                <div key={idx} style={{
                                    position: 'relative',
                                    marginBottom: '16px',
                                    paddingBottom: '16px',
                                    borderBottom: idx < workOrder.progressNotes.length - 1 ? '1px solid #f3f4f6' : 'none'
                                }}>
                                    {/* Timeline dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-20px',
                                        top: '4px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: '#2563eb',
                                        border: '2px solid white',
                                        boxShadow: '0 0 0 2px #e5e7eb'
                                    }} />

                                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#374151', marginBottom: '4px' }}>
                                        {note.note}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        {note.addedBy?.fullName || note.addedBy?.username} • {formatDateTime(note.addedAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: '40px',
                    paddingTop: '20px',
                    borderTop: '2px solid #e5e7eb',
                    fontSize: '11px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: '0 0 4px 0' }}>
                        This is an official work order document generated by FleetPro Management System
                    </p>
                    <p style={{ margin: '0' }}>
                        Printed on: {formatDateTime(new Date())}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkOrderPrintTemplate;
