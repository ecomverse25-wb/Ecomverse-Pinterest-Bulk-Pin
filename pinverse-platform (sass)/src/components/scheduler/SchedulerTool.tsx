"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MoreVertical, Plus } from "lucide-react";
import { getScheduledPinsAction, ScheduledPin } from "@/app/actions/scheduler-actions";
import { Badge } from "@/components/ui/badge";

export default function SchedulerTool() {
    const [scheduledPins, setScheduledPins] = useState<ScheduledPin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        const result = await getScheduledPinsAction(new Date(), new Date());
        if (result.success && result.data) {
            setScheduledPins(result.data);
        }
        setLoading(false);
    };

    // Group pins by date for easier viewing
    const groupedPins = scheduledPins.reduce((acc, pin) => {
        const dateKey = new Date(pin.scheduledTime).toLocaleDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(pin);
        return acc;
    }, {} as Record<string, ScheduledPin[]>);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Main Calendar / Schedule Feed */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Scheduled Pins
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline">Weekly View</Button>
                            <Button size="sm">Monthly View</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">Loading schedule...</div>
                        ) : Object.keys(groupedPins).length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No pins scheduled. Add some from the queue!
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedPins).map(([date, pins]) => (
                                    <div key={date}>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-3 sticky top-0 bg-card py-2 z-10">
                                            {date}
                                        </h3>
                                        <div className="space-y-3">
                                            {pins.map(pin => (
                                                <div key={pin.id} className="flex items-center gap-4 p-3 rounded-lg border bg-accent/20 hover:bg-accent/40 transition-colors group">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={pin.image} alt={pin.title} className="w-16 h-24 object-cover rounded-md" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate">{pin.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(pin.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <span className="w-1 h-1 rounded-full bg-slate-500" />
                                                            Board: {pin.boardId}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={pin.status === 'published' ? 'default' : 'secondary'} className="capitalize">
                                                            {pin.status}
                                                        </Badge>
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar Queue */}
            <div className="space-y-6">
                <Card className="h-full flex flex-col bg-secondary/10 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Unscheduled Queue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                                <Plus className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Queue is empty</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Generate pins with the Master Writer to fill this queue.
                            </p>
                            <Button variant="ghost" className="mt-2 text-primary">
                                Go to Master Writer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
