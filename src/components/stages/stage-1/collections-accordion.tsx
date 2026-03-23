"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Package, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/brand";

interface CollectionsAccordionProps {
  collections: Collection[];
}

export function CollectionsAccordion({ collections }: CollectionsAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="h-4 w-4" />
          Collections & Products
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections found
          </p>
        ) : (
          collections.map((collection, index) => (
            <div key={collection.slug} className="border border-border rounded-md">
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {openIndex === index ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{collection.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {collection.products.length} products
                  </Badge>
                </div>
              </button>

              {openIndex === index && (
                <div className="border-t border-border px-3 py-2">
                  {collection.products.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No products in this collection
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {collection.products.map((product) => (
                        <div
                          key={product.slug}
                          className="flex items-start gap-2 rounded-md border border-border p-2"
                        >
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover bg-muted"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {product.name}
                            </p>
                            {product.price && (
                              <p className="text-xs text-muted-foreground">
                                ${product.price}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
