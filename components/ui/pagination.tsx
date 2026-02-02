"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    className?: string;
};

export function Pagination({ currentPage, totalPages, className }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function createPageURL(pageNumber: number | string) {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    }

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            let startPage = Math.max(1, currentPage - 1);
            let endPage = Math.min(totalPages, currentPage + 1);

            if (currentPage <= 2) {
                endPage = Math.min(totalPages, maxVisiblePages - 1);
            } else if (currentPage >= totalPages - 1) {
                startPage = Math.max(1, totalPages - (maxVisiblePages - 2));
            }

            if (startPage > 1) {
                pageNumbers.push(1);
                if (startPage > 2) pageNumbers.push("...");
            }

            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pageNumbers.push("...");
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    if (totalPages <= 1) return null;

    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            {currentPage <= 1 ? (
                <span
                    className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "h-8 w-8 p-0 opacity-50 pointer-events-none")}
                    aria-hidden="true"
                >
                    &laquo;
                </span>
            ) : (
                <Link
                    href={createPageURL(currentPage - 1)}
                    className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "h-8 w-8 p-0")}
                    aria-label="Previous page"
                >
                    <span>&laquo;</span>
                </Link>
            )}

            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                        return (
                            <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                                ...
                            </span>
                        );
                    }

                    const isCurrent = page === currentPage;
                    return isCurrent ? (
                        <span
                            key={page}
                            className={cn(buttonStyles({ variant: "primary", size: "sm" }), "h-8 w-8 p-0 pointer-events-none")}
                            aria-current="page"
                        >
                            {page}
                        </span>
                    ) : (
                        <Link
                            key={page}
                            href={createPageURL(page)}
                            className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "h-8 w-8 p-0")}
                        >
                            {page}
                        </Link>
                    );
                })}
            </div>

            {currentPage >= totalPages ? (
                <span
                    className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "h-8 w-8 p-0 opacity-50 pointer-events-none")}
                    aria-hidden="true"
                >
                    &raquo;
                </span>
            ) : (
                <Link
                    href={createPageURL(currentPage + 1)}
                    className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "h-8 w-8 p-0")}
                    aria-label="Next page"
                >
                    <span>&raquo;</span>
                </Link>
            )}
        </div>
    );
}
